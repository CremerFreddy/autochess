using System.Collections;
using System.Collections.Generic;
using UnityEngine;

public class schachbrett : MonoBehaviour
{
    public schachfeld [,] brettArray;
    public GameObject[,] units;
    public GameObject chessfieldPrefab;
    public int size;
    // Start is called before the first frame update
    void Start()
    {
        brettArray = new schachfeld[size,size];
        units = new GameObject[size, size];
        for(int i = 0; i<size; i++)
        {
            for (int j = 0; j<size;j++)
            {
                GameObject feld = Instantiate(chessfieldPrefab, new Vector3(i, 0, j), Quaternion.identity);
                schachfeld feld1 = feld.GetComponent<schachfeld>();
                feld1.brett = this;
                brettArray[i, j] = feld1;
                feld1.x = i;
                feld1.y = j;
                
            }
        }
        
    }

    // Update is called once per frame
    void Update()
    {
        
    }

    public int getRange(int x1, int y1, int x2, int y2)
    {
        int range = 2;
        if(System.Math.Abs(x1-x2) > System.Math.Abs(y1-y2))
        {
            range  = System.Math.Abs(x1-x2);
        }
        else
        {
            range = System.Math.Abs(y1 - y2);
        }
        
        return range;
    }
}
