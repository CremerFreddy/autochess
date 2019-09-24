using System.Collections;
using System.Collections.Generic;
using UnityEngine;

/// <summary>
/// The Follower.
/// </summary>

public class Follower : MonoBehaviour
{

    [SerializeField]
    protected Graph m_Graph;
    [SerializeField]
    protected Node m_Start;
    [SerializeField]
    protected Node m_End;
    [SerializeField]
    protected float m_Speed = 1f;
    public Path m_Path;
    protected Node m_Current;

    void Start()
    {

    }

    public void setStart(Node node1)
    {
        m_Start = node1;
    }
    public void setEnd(Node node1)
    {
        m_End = node1;
        for (int i = 0; i < 1; i++)
        {
            Debug.Log(i);
            m_Path = m_Graph.GetShortestPath(m_Start, m_End);
        }
        Follow(m_Path);
    }
    public void setGraph(Graph graph1)
    {
        m_Graph = graph1;
        m_Path = new Path();
    }

    /// <summary>
    /// Follow the specified path.
    /// </summary>
    /// <param name="path">Path.</param>
    public void Follow(Path path)
    {
        StopCoroutine("FollowPath");
        m_Path = path;
        Vector3 target = new Vector3(path.nodes[0].transform.position.x, 10, path.nodes[0].transform.position.z);
        transform.position = target;
        StartCoroutine("FollowPath");
    }

    /// <summary>
    /// Following the path.
    /// </summary>
    /// <returns>The path.</returns>
    IEnumerator FollowPath()
    {
        var e = m_Path.nodes.GetEnumerator();
        while (e.MoveNext())
        {
            //falls feld blockiert ist, neuen weg suchen.
            if(e.Current.blocked)
            {
                if(e.MoveNext())
                {
                    setStart(m_Current);
                    setEnd(m_End);
                    break;
                }//falls man vor ziel steht, bewegung stoppen
                else
                {
                    break;
                }

            }
            else
            {
                if (m_Current != null)
                {
                    m_Current.blocked = false;
                }

                m_Current = e.Current;
                m_Current.blocked = true;

                // Wait until we reach the current target node and then go to next node
                yield return new WaitUntil(() =>
                {
                    Vector3 target = new Vector3(m_Current.transform.position.x, 10, m_Current.transform.position.z);
                    return transform.position == target;
                });
            }
            
        }
        m_Current = null;
    }

    void Update()
    {
        if (m_Current != null)
        {
            Vector3 target = new Vector3(m_Current.transform.position.x, 10, m_Current.transform.position.z);
            transform.position = Vector3.MoveTowards(transform.position, target, m_Speed);
        }
    }

}
