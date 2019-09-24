using UnityEngine;
using System.Collections;
using UnityEngine.EventSystems;

public class DragHandler : MonoBehaviour, IBeginDragHandler, IDragHandler, IEndDragHandler
{
    public static GameObject itemBeingDragged;
    Vector3 startPosition;
    Transform startParent;
    public controlsManager controls;
    public int id;


    #region IBeginDragHandler implementation

    public void OnBeginDrag(PointerEventData eventData)
    {
        itemBeingDragged = gameObject;
        startPosition = transform.position;
        startParent = transform.parent;
        controls.cardSelected = true;
    }

    #endregion

    #region IDragHandler implementation

    public void OnDrag(PointerEventData eventData)
    {
        transform.position = eventData.position;
    }

    #endregion

    #region IEndDragHandler implementation

    public void OnEndDrag(PointerEventData eventData)
    {
        if (controls.selectedfield.GetComponent<Node>().blocked == false && controls.selectedfield != null)
        {
            GameObject obj;
            if (id == 0)
            {
                obj = Instantiate(controls.myPrefab, new Vector3(controls.selectedfield.x * 10, 10, controls.selectedfield.y * 10), Quaternion.identity);
            }
            else
            {
                obj = Instantiate(controls.myEnemiePrefab, new Vector3(controls.selectedfield.x * 10, 10, controls.selectedfield.y * 10), Quaternion.identity);
            }
            AI objAI = obj.GetComponent<AI>();
            objAI.feld = controls.selectedfield;
            objAI.feld.onField = objAI;
            Follower fol1 = objAI.GetComponent<Follower>();
            fol1.setGraph(controls.brett.GetComponent<Graph>());
            fol1.setStart(objAI.feld.GetComponent<Node>());
            fol1.m_Path.m_Nodes = controls.brett.GetComponent<Graph>().nodes;
            Debug.Log(fol1.m_Path.m_Nodes.Count);
            Destroy(itemBeingDragged);
            fol1.setEnd(controls.brett.brettArray[5, 6].GetComponent<Node>());
        }
        
        controls.cardSelected = false;

    }

    #endregion



}
